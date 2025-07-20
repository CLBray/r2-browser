// Test configuration and utilities for authentication testing

import { vi } from 'vitest';
import type { MockApiClientConfig } from './mock-api';
import type { MockStorageConfig } from './mock-storage';

// Test environment configuration
export interface TestEnvironmentConfig {
  // API configuration
  api?: MockApiClientConfig;
  
  // Storage configuration
  localStorage?: MockStorageConfig;
  sessionStorage?: MockStorageConfig;
  
  // Timer configuration
  timers?: {
    useFakeTimers?: boolean;
    advanceTimersAutomatically?: boolean;
    timerLimit?: number;
  };
  
  // Network configuration
  network?: {
    online?: boolean;
    slow?: boolean;
    unreliable?: boolean;
  };
  
  // Performance configuration
  performance?: {
    enableTracking?: boolean;
    slowThreshold?: number;
  };
  
  // Console configuration
  console?: {
    suppressWarnings?: boolean;
    suppressErrors?: boolean;
    trackCalls?: boolean;
  };
}

// Default test environment configuration
export const defaultTestConfig: TestEnvironmentConfig = {
  api: {
    trackRequests: true,
    networkDelay: 0
  },
  localStorage: {
    trackOperations: true
  },
  sessionStorage: {
    trackOperations: true
  },
  timers: {
    useFakeTimers: true,
    advanceTimersAutomatically: false,
    timerLimit: 100
  },
  network: {
    online: true,
    slow: false,
    unreliable: false
  },
  performance: {
    enableTracking: true,
    slowThreshold: 1000
  },
  console: {
    suppressWarnings: false,
    suppressErrors: false,
    trackCalls: true
  }
};

// Test environment setup
export class TestEnvironment {
  private config: TestEnvironmentConfig;
  private originalFetch: typeof fetch;
  private originalOnLine: boolean;
  
  constructor(config: TestEnvironmentConfig = defaultTestConfig) {
    this.config = { ...defaultTestConfig, ...config };
    this.originalFetch = global.fetch;
    this.originalOnLine = navigator.onLine;
  }

  setup() {
    this.setupTimers();
    this.setupNetwork();
    this.setupPerformance();
    this.setupConsole();
  }

  teardown() {
    this.restoreTimers();
    this.restoreNetwork();
    this.restorePerformance();
    this.restoreConsole();
  }

  private setupTimers() {
    if (this.config.timers?.useFakeTimers) {
      vi.useFakeTimers();
      
      if (this.config.timers.advanceTimersAutomatically) {
        vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      }
    }
  }

  private restoreTimers() {
    if (this.config.timers?.useFakeTimers) {
      vi.useRealTimers();
    }
  }

  private setupNetwork() {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: this.config.network?.online ?? true,
      writable: true,
      configurable: true
    });

    // Enhance fetch mock based on network conditions
    if (this.config.network?.slow || this.config.network?.unreliable) {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(async (...args) => {
        // Simulate slow network
        if (this.config.network?.slow) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Simulate unreliable network
        if (this.config.network?.unreliable && Math.random() < 0.3) {
          throw new Error('Network error: Connection failed');
        }
        
        return originalFetch(...args);
      });
    }
  }

  private restoreNetwork() {
    Object.defineProperty(navigator, 'onLine', {
      value: this.originalOnLine,
      writable: true,
      configurable: true
    });
    
    global.fetch = this.originalFetch;
  }

  private setupPerformance() {
    if (this.config.performance?.enableTracking) {
      // Performance tracking is already set up in test setup
    }
  }

  private restorePerformance() {
    // Performance restoration is handled in test setup
  }

  private setupConsole() {
    if (this.config.console?.suppressWarnings) {
      console.warn = vi.fn();
    }
    
    if (this.config.console?.suppressErrors) {
      console.error = vi.fn();
    }
  }

  private restoreConsole() {
    // Console restoration is handled in test setup
  }

  // Helper methods for test control
  advanceTime(ms: number) {
    if (this.config.timers?.useFakeTimers) {
      vi.advanceTimersByTime(ms);
    }
  }

  async flushPromises() {
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  setNetworkOnline(online: boolean) {
    Object.defineProperty(navigator, 'onLine', {
      value: online,
      writable: true,
      configurable: true
    });
  }

  simulateNetworkError() {
    const mockFetch = global.fetch as any;
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
  }

  simulateSlowNetwork(delay: number = 1000) {
    const mockFetch = global.fetch as any;
    mockFetch.mockImplementationOnce(async (...args: any[]) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.originalFetch(...args);
    });
  }
}

// Test scenario builder
export class TestScenarioBuilder {
  private config: TestEnvironmentConfig = {};

  withApiConfig(apiConfig: MockApiClientConfig) {
    this.config.api = { ...this.config.api, ...apiConfig };
    return this;
  }

  withStorageConfig(storageConfig: MockStorageConfig) {
    this.config.localStorage = { ...this.config.localStorage, ...storageConfig };
    return this;
  }

  withNetworkConditions(online: boolean, slow: boolean = false, unreliable: boolean = false) {
    this.config.network = { online, slow, unreliable };
    return this;
  }

  withTimerConfig(useFakeTimers: boolean = true, advanceAutomatically: boolean = false) {
    this.config.timers = { useFakeTimers, advanceTimersAutomatically: advanceAutomatically };
    return this;
  }

  withPerformanceTracking(enabled: boolean = true, slowThreshold: number = 1000) {
    this.config.performance = { enableTracking: enabled, slowThreshold };
    return this;
  }

  suppressConsole(warnings: boolean = false, errors: boolean = false) {
    this.config.console = { suppressWarnings: warnings, suppressErrors: errors };
    return this;
  }

  build(): TestEnvironment {
    return new TestEnvironment(this.config);
  }
}

// Common test scenarios
export const testScenarios = {
  // Normal operation
  normal: () => new TestScenarioBuilder().build(),
  
  // Offline scenario
  offline: () => new TestScenarioBuilder()
    .withNetworkConditions(false)
    .build(),
  
  // Slow network scenario
  slowNetwork: () => new TestScenarioBuilder()
    .withNetworkConditions(true, true)
    .build(),
  
  // Unreliable network scenario
  unreliableNetwork: () => new TestScenarioBuilder()
    .withNetworkConditions(true, false, true)
    .build(),
  
  // Storage unavailable scenario
  storageUnavailable: () => new TestScenarioBuilder()
    .withStorageConfig({ unavailable: true })
    .build(),
  
  // Storage quota exceeded scenario
  storageQuotaExceeded: () => new TestScenarioBuilder()
    .withStorageConfig({ quotaExceeded: true })
    .build(),
  
  // Performance testing scenario
  performanceTest: () => new TestScenarioBuilder()
    .withPerformanceTracking(true, 100)
    .withTimerConfig(true, true)
    .build(),
  
  // Silent testing scenario (suppress console output)
  silent: () => new TestScenarioBuilder()
    .suppressConsole(true, true)
    .build()
};

// Test utilities for common operations
export const testUtils = {
  // Wait for all pending promises and timers
  async waitForAll() {
    await vi.runAllTimersAsync();
    await new Promise(resolve => setTimeout(resolve, 0));
  },
  
  // Wait for specific time with fake timers
  async waitFor(ms: number) {
    vi.advanceTimersByTime(ms);
    await new Promise(resolve => setTimeout(resolve, 0));
  },
  
  // Create a promise that resolves after specified time
  delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Create a promise that rejects after specified time
  timeout(ms: number, message: string = 'Timeout'): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error(message)), ms)
    );
  },
  
  // Race between promise and timeout
  async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      this.timeout(timeoutMs, `Operation timed out after ${timeoutMs}ms`)
    ]);
  }
};

// Performance testing utilities
export const performanceUtils = {
  // Measure execution time of a function
  async measure<T>(name: string, fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    
    return { result, duration };
  },
  
  // Assert that operation completes within threshold
  async assertPerformance<T>(
    name: string, 
    fn: () => Promise<T> | T, 
    thresholdMs: number
  ): Promise<T> {
    const { result, duration } = await this.measure(name, fn);
    
    if (duration > thresholdMs) {
      throw new Error(
        `Performance assertion failed: ${name} took ${duration.toFixed(2)}ms, ` +
        `expected less than ${thresholdMs}ms`
      );
    }
    
    return result;
  },
  
  // Create performance benchmark
  async benchmark<T>(
    name: string,
    fn: () => Promise<T> | T,
    iterations: number = 10
  ): Promise<{ average: number; min: number; max: number; results: T[] }> {
    const durations: number[] = [];
    const results: T[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const { result, duration } = await this.measure(`${name} (iteration ${i + 1})`, fn);
      durations.push(duration);
      results.push(result);
    }
    
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    
    console.log(`Benchmark ${name}: avg=${average.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
    
    return { average, min, max, results };
  }
};