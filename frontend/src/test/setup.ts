import '@testing-library/jest-dom';
import { vi, beforeEach, afterEach } from 'vitest';

// Enhanced localStorage mock for authentication testing
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
    // Test helpers
    _getStore: () => ({ ...store }),
    _setStore: (newStore: Record<string, string>) => { store = { ...newStore }; },
    _reset: () => { 
      store = {};
      // Clear mock call history
      Object.values(localStorageMock).forEach(fn => {
        if (typeof fn === 'function' && 'mockClear' in fn) {
          fn.mockClear();
        }
      });
    }
  };
};

const localStorageMock = createLocalStorageMock();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true
});

// Mock sessionStorage similarly
const sessionStorageMock = createLocalStorageMock();
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true
});

// Mock fetch for API testing
global.fetch = vi.fn();

// Mock performance API for authentication performance testing
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn(() => []),
  getEntriesByType: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  timeOrigin: Date.now()
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
  configurable: true
});

// Mock timers for authentication timer testing
vi.useFakeTimers();

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  
  constructor() {
    this.root = null;
    this.rootMargin = '';
    this.thresholds = [];
  }
  
  disconnect() {
    return null;
  }
  
  observe() {
    return null;
  }
  
  takeRecords() {
    return [];
  }
  
  unobserve() {
    return null;
  }
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver
});

// Mock ResizeObserver
class MockResizeObserver {
  observe() {
    return null;
  }
  
  unobserve() {
    return null;
  }
  
  disconnect() {
    return null;
  }
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver
});

// Mock crypto for token generation in tests
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: vi.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).substring(2))
  },
  writable: true,
  configurable: true
});

// Enhanced console mocking for authentication testing
const originalConsole = { ...console };
const consoleMocks = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Setup and teardown for each test
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
  // Reset localStorage
  localStorageMock._reset();
  sessionStorageMock._reset();
  
  // Reset timers
  vi.clearAllTimers();
  
  // Reset fetch mock
  (global.fetch as any).mockClear();
  
  // Reset performance mock
  Object.values(mockPerformance).forEach(fn => {
    if (typeof fn === 'function' && 'mockClear' in fn) {
      fn.mockClear();
    }
  });
  
  // Reset console mocks
  Object.assign(console, consoleMocks);
  Object.values(consoleMocks).forEach(mock => mock.mockClear());
});

afterEach(() => {
  // Restore console
  Object.assign(console, originalConsole);
  
  // Clean up any remaining timers
  if (vi.isFakeTimers()) {
    vi.clearAllTimers();
    vi.runOnlyPendingTimers();
  }
});

// Suppress React 18/19 console errors
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' && 
    (args[0].includes('ReactDOM.render is no longer supported') || 
     args[0].includes('React.createFactory is deprecated') ||
     args[0].includes('Warning: ReactDOM.render is no longer supported'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Global test utilities
declare global {
  var __TEST_UTILS__: {
    localStorage: typeof localStorageMock;
    sessionStorage: typeof sessionStorageMock;
    performance: typeof mockPerformance;
    console: typeof consoleMocks;
  };
}

globalThis.__TEST_UTILS__ = {
  localStorage: localStorageMock,
  sessionStorage: sessionStorageMock,
  performance: mockPerformance,
  console: consoleMocks
};