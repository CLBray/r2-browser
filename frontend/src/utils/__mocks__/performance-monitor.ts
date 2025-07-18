/**
 * Mock implementation of the PerformanceMonitor class for testing
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  public init(): void {
    this.isInitialized = true;
  }

  public destroy(): void {
    this.isInitialized = false;
  }

  public setUserInfo(): void {}
  public trackPageLoad(): void {}
  public trackUserInteraction(): void {}
  public trackFileOperation(): void {}
  public trackApiRequest(): void {}
  public trackError(): void {}
}

export const performanceMonitor = {
  init: vi.fn(),
  destroy: vi.fn(),
  setUserInfo: vi.fn(),
  trackPageLoad: vi.fn(),
  trackUserInteraction: vi.fn(),
  trackFileOperation: vi.fn(),
  trackApiRequest: vi.fn(),
  trackError: vi.fn()
};