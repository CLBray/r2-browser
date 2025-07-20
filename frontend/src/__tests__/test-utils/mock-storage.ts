// Mock localStorage implementation for testing

import { vi } from 'vitest';

export interface MockStorageInterface {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
  key: ReturnType<typeof vi.fn>;
  length: number;
}

export interface MockStorageConfig {
  // Initial data to populate the storage
  initialData?: Record<string, string>;
  
  // Simulate storage quota exceeded
  quotaExceeded?: boolean;
  quotaLimit?: number;
  
  // Simulate storage unavailable
  unavailable?: boolean;
  
  // Simulate storage errors
  throwOnGet?: boolean;
  throwOnSet?: boolean;
  throwOnRemove?: boolean;
  throwOnClear?: boolean;
  
  // Track operations
  trackOperations?: boolean;
}

export class MockStorage implements MockStorageInterface {
  private store: Record<string, string> = {};
  private config: MockStorageConfig;
  private currentSize = 0;
  
  // Operation tracking
  public operations: Array<{
    operation: 'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key';
    key?: string;
    value?: string;
    timestamp: number;
  }> = [];

  // Mock functions
  public getItem = vi.fn();
  public setItem = vi.fn();
  public removeItem = vi.fn();
  public clear = vi.fn();
  public key = vi.fn();

  constructor(config: MockStorageConfig = {}) {
    this.config = config;
    
    // Initialize with provided data
    if (config.initialData) {
      this.store = { ...config.initialData };
      this.currentSize = Object.values(this.store).join('').length;
    }
    
    // Set up mock implementations
    this.setupMockImplementations();
  }

  private setupMockImplementations() {
    this.getItem.mockImplementation((key: string) => {
      this.trackOperation('getItem', key);
      
      if (this.config.unavailable) {
        throw new Error('localStorage is not available');
      }
      
      if (this.config.throwOnGet) {
        throw new Error('Failed to get item from localStorage');
      }
      
      return this.store[key] || null;
    });

    this.setItem.mockImplementation((key: string, value: string) => {
      this.trackOperation('setItem', key, value);
      
      if (this.config.unavailable) {
        throw new Error('localStorage is not available');
      }
      
      if (this.config.throwOnSet) {
        throw new Error('Failed to set item in localStorage');
      }
      
      // Check quota
      const newSize = this.currentSize + value.length - (this.store[key]?.length || 0);
      if (this.config.quotaExceeded || (this.config.quotaLimit && newSize > this.config.quotaLimit)) {
        const error = new Error('QuotaExceededError: localStorage quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      }
      
      this.store[key] = value;
      this.currentSize = newSize;
    });

    this.removeItem.mockImplementation((key: string) => {
      this.trackOperation('removeItem', key);
      
      if (this.config.unavailable) {
        throw new Error('localStorage is not available');
      }
      
      if (this.config.throwOnRemove) {
        throw new Error('Failed to remove item from localStorage');
      }
      
      if (this.store[key]) {
        this.currentSize -= this.store[key].length;
        delete this.store[key];
      }
    });

    this.clear.mockImplementation(() => {
      this.trackOperation('clear');
      
      if (this.config.unavailable) {
        throw new Error('localStorage is not available');
      }
      
      if (this.config.throwOnClear) {
        throw new Error('Failed to clear localStorage');
      }
      
      this.store = {};
      this.currentSize = 0;
    });

    this.key.mockImplementation((index: number) => {
      this.trackOperation('key');
      
      if (this.config.unavailable) {
        throw new Error('localStorage is not available');
      }
      
      const keys = Object.keys(this.store);
      return keys[index] || null;
    });
  }

  private trackOperation(operation: string, key?: string, value?: string) {
    if (this.config.trackOperations) {
      this.operations.push({
        operation: operation as any,
        key,
        value,
        timestamp: Date.now()
      });
    }
  }

  // Getter for length property
  get length(): number {
    return Object.keys(this.store).length;
  }

  // Update configuration
  updateConfig(newConfig: Partial<MockStorageConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  // Reset storage state
  reset() {
    this.store = this.config.initialData ? { ...this.config.initialData } : {};
    this.currentSize = Object.values(this.store).join('').length;
    this.operations = [];
    
    // Clear mock call history
    this.getItem.mockClear();
    this.setItem.mockClear();
    this.removeItem.mockClear();
    this.clear.mockClear();
    this.key.mockClear();
  }

  // Get current storage data (for testing)
  getData(): Record<string, string> {
    return { ...this.store };
  }

  // Get storage size (for testing)
  getSize(): number {
    return this.currentSize;
  }

  // Get operations history (for testing)
  getOperations(): typeof this.operations {
    return [...this.operations];
  }

  // Check if a key exists
  hasKey(key: string): boolean {
    return key in this.store;
  }

  // Get all keys
  getKeys(): string[] {
    return Object.keys(this.store);
  }
}

// Factory function to create mock storage
export const createMockStorage = (config: MockStorageConfig = {}): MockStorage => {
  return new MockStorage(config);
};

// Helper to create localStorage mock for window object
export const createLocalStorageMock = (config: MockStorageConfig = {}): MockStorage => {
  const mockStorage = createMockStorage(config);
  
  // Replace window.localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true
  });
  
  return mockStorage;
};

// Helper to create sessionStorage mock for window object
export const createSessionStorageMock = (config: MockStorageConfig = {}): MockStorage => {
  const mockStorage = createMockStorage(config);
  
  // Replace window.sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: mockStorage,
    writable: true,
    configurable: true
  });
  
  return mockStorage;
};

// Helper to restore original storage
export const restoreStorage = () => {
  // Create a basic storage implementation for restoration
  const createBasicStorage = () => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      key: (index: number) => Object.keys(store)[index] || null,
      get length() { return Object.keys(store).length; }
    };
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: createBasicStorage(),
    writable: true,
    configurable: true
  });
  
  Object.defineProperty(window, 'sessionStorage', {
    value: createBasicStorage(),
    writable: true,
    configurable: true
  });
};

// Storage test scenarios
export interface StorageTestScenario {
  name: string;
  description: string;
  config: MockStorageConfig;
  expectedBehavior: string;
}

export const storageTestScenarios: StorageTestScenario[] = [
  {
    name: 'normal_operation',
    description: 'Normal storage operations work correctly',
    config: {},
    expectedBehavior: 'All operations succeed'
  },
  {
    name: 'quota_exceeded',
    description: 'Storage quota is exceeded',
    config: { quotaExceeded: true },
    expectedBehavior: 'setItem throws QuotaExceededError'
  },
  {
    name: 'storage_unavailable',
    description: 'Storage is completely unavailable',
    config: { unavailable: true },
    expectedBehavior: 'All operations throw errors'
  },
  {
    name: 'get_errors',
    description: 'getItem operations fail',
    config: { throwOnGet: true },
    expectedBehavior: 'getItem throws errors'
  },
  {
    name: 'set_errors',
    description: 'setItem operations fail',
    config: { throwOnSet: true },
    expectedBehavior: 'setItem throws errors'
  },
  {
    name: 'limited_quota',
    description: 'Storage has limited quota',
    config: { quotaLimit: 1000 },
    expectedBehavior: 'setItem fails when quota exceeded'
  },
  {
    name: 'with_initial_data',
    description: 'Storage starts with existing data',
    config: { 
      initialData: { 
        'r2_explorer_auth_token': 'existing-token',
        'r2_explorer_auth_expiry': '1234567890'
      }
    },
    expectedBehavior: 'Initial data is available'
  }
];

// Helper to run storage scenario tests
export const runStorageScenario = (scenario: StorageTestScenario): MockStorage => {
  return createMockStorage(scenario.config);
};